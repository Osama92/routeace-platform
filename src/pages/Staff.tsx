import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  UserPlus,
  Building2,
  DollarSign,
  Search,
  Filter,
  Loader2,
  Edit,
  Trash2,
  Eye,
  Briefcase,
  Calculator,
  ReceiptText,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface Staff {
  id: string;
  user_id?: string | null;
  organization_id?: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  job_title: string;
  department: string | null;
  employment_type: "owned" | "outsourced";
  partner_id: string | null;
  hire_date: string | null;
  salary_type: "monthly" | "bi_monthly" | "hourly";
  base_salary: number;
  nhf_contribution: number;
  nhis_contribution: number;
  pension_contribution: number;
  life_insurance: number;
  annual_rent_relief: number;
  tax_id: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  status: "active" | "on_leave" | "terminated";
  created_at: string;
  partners?: { company_name: string } | null;
}

interface Partner {
  id: string;
  company_name: string;
}

interface WorkforceEconomics {
  monthRevenue: number;
  approvedExpenses: number;
  paidPayroll: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);
};

const StaffPage = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [economics, setEconomics] = useState<WorkforceEconomics>({
    monthRevenue: 0,
    approvedExpenses: 0,
    paidPayroll: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    job_title: "",
    department: "",
    employment_type: "owned" as "owned" | "outsourced",
    partner_id: "",
    hire_date: "",
    salary_type: "monthly" as "monthly" | "bi_monthly" | "hourly",
    base_salary: 0,
    tax_id: "",
    bank_name: "",
    bank_account_number: "",
    bank_account_name: "",
    status: "active" as "active" | "on_leave" | "terminated",
  });
  const { toast } = useToast();
  const { organizationId } = useAuth();

  const fetchStaff = async () => {
    try {
      if (!organizationId) {
        setStaff([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("staff")
        .select(`*, partners(company_name)`)
        .eq("organization_id", organizationId)
        .order("full_name");
      if (error) throw error;
      const ids = (data || []).map((s: any) => s.id);
      let sensMap: Record<string, any> = {};
      if (ids.length) {
        const { data: sens } = await supabase
          .from("staff_sensitive_details")
          .select("staff_id, tax_id, bank_name, bank_account_number, bank_account_name")
          .in("staff_id", ids);
        (sens || []).forEach((s: any) => { sensMap[s.staff_id] = s; });
      }
      const merged = (data || []).map((s: any) => ({
        ...s,
        tax_id: sensMap[s.id]?.tax_id ?? null,
        bank_name: sensMap[s.id]?.bank_name ?? null,
        bank_account_number: sensMap[s.id]?.bank_account_number ?? null,
        bank_account_name: sensMap[s.id]?.bank_account_name ?? null,
      }));
      setStaff(merged as Staff[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch staff",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPartners = async () => {
    try {
      if (!organizationId) {
        setPartners([]);
        return;
      }

      const { data, error } = await supabase
        .from("partners")
        .select("id, company_name")
        .eq("organization_id", organizationId)
        .order("company_name");
      if (error) throw error;
      setPartners(data || []);
    } catch (error: any) {
      console.error("Failed to fetch partners:", error);
    }
  };

  const fetchWorkforceEconomics = async () => {
    if (!organizationId) {
      setEconomics({ monthRevenue: 0, approvedExpenses: 0, paidPayroll: 0 });
      return;
    }

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const from = monthStart.toISOString();

    const [invoiceRes, expenseRes, payrollRes] = await Promise.all([
      supabase
        .from("invoices")
        .select("total_amount, amount, status")
        .eq("organization_id", organizationId)
        .gte("created_at", from),
      supabase
        .from("expenses")
        .select("amount, approval_status")
        .eq("organization_id", organizationId)
        .gte("created_at", from),
      supabase
        .from("staff_salaries")
        .select("gross_amount, status")
        .eq("organization_id", organizationId)
        .gte("created_at", from),
    ]);

    if (invoiceRes.error || expenseRes.error || payrollRes.error) {
      console.warn("Failed to fetch workforce economics", {
        invoices: invoiceRes.error?.message,
        expenses: expenseRes.error?.message,
        payroll: payrollRes.error?.message,
      });
    }

    const monthRevenue = (invoiceRes.data ?? [])
      .filter((row: any) => !["void", "cancelled", "draft"].includes(String(row.status ?? "").toLowerCase()))
      .reduce((sum: number, row: any) => sum + Number(row.total_amount ?? row.amount ?? 0), 0);
    const approvedExpenses = (expenseRes.data ?? [])
      .filter((row: any) => ["approved", "paid"].includes(String(row.approval_status ?? "approved").toLowerCase()))
      .reduce((sum: number, row: any) => sum + Number(row.amount ?? 0), 0);
    const paidPayroll = (payrollRes.data ?? [])
      .filter((row: any) => ["approved", "paid"].includes(String(row.status ?? "").toLowerCase()))
      .reduce((sum: number, row: any) => sum + Number(row.gross_amount ?? 0), 0);

    setEconomics({ monthRevenue, approvedExpenses, paidPayroll });
  };

  useEffect(() => {
    if (organizationId !== undefined) {
      fetchStaff();
      fetchPartners();
      fetchWorkforceEconomics();
    }
  }, [organizationId]);

  const handleAddStaff = async () => {
    if (!organizationId) {
      toast({
        title: "Organization required",
        description: "Staff can only be added inside the current organization.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.full_name || !formData.job_title) {
      toast({
        title: "Validation Error",
        description: "Full name and job title are required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const insertData: any = {
        organization_id: organizationId,
        full_name: formData.full_name,
        email: formData.email || null,
        phone: formData.phone || null,
        job_title: formData.job_title,
        department: formData.department || null,
        employment_type: formData.employment_type,
        partner_id: formData.employment_type === "outsourced" && formData.partner_id ? formData.partner_id : null,
        hire_date: formData.hire_date || null,
        salary_type: formData.salary_type,
        base_salary: formData.base_salary,
        status: formData.status,
      };

      const { data: inserted, error } = await supabase.from("staff").insert([insertData]).select("id").single();

      if (error) throw error;

      if (inserted && (formData.tax_id || formData.bank_name || formData.bank_account_number || formData.bank_account_name)) {
        await supabase.from("staff_sensitive_details").upsert({
          staff_id: inserted.id,
          organization_id: organizationId,
          tax_id: formData.tax_id || null,
          bank_name: formData.bank_name || null,
          bank_account_number: formData.bank_account_number || null,
          bank_account_name: formData.bank_account_name || null,
        }, { onConflict: "staff_id" });
      }

      toast({
        title: "Success",
        description: "Staff member added successfully",
      });

      setIsAddDialogOpen(false);
      resetForm();
      fetchStaff();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add staff",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStaff = async () => {
    if (!selectedStaff) return;
    if (!organizationId || selectedStaff.organization_id !== organizationId) {
      toast({
        title: "Update blocked",
        description: "This staff member is not assigned to the current organization.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const updateData: any = {
        full_name: formData.full_name,
        email: formData.email || null,
        phone: formData.phone || null,
        job_title: formData.job_title,
        department: formData.department || null,
        employment_type: formData.employment_type,
        partner_id: formData.employment_type === "outsourced" && formData.partner_id ? formData.partner_id : null,
        hire_date: formData.hire_date || null,
        salary_type: formData.salary_type,
        base_salary: formData.base_salary,
        status: formData.status,
      };

      const { error } = await supabase
        .from("staff")
        .update(updateData)
        .eq("id", selectedStaff.id)
        .eq("organization_id", organizationId);

      if (error) throw error;

      await supabase.from("staff_sensitive_details").upsert({
        staff_id: selectedStaff.id,
        organization_id: organizationId,
        tax_id: formData.tax_id || null,
        bank_name: formData.bank_name || null,
        bank_account_number: formData.bank_account_number || null,
        bank_account_name: formData.bank_account_name || null,
      }, { onConflict: "staff_id" });

      toast({
        title: "Success",
        description: "Staff member updated successfully",
      });

      setIsEditDialogOpen(false);
      setSelectedStaff(null);
      resetForm();
      fetchStaff();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update staff",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!organizationId) return;
    if (!confirm("Are you sure you want to delete this staff member?")) return;

    try {
      const { error } = await supabase.from("staff").delete().eq("id", id).eq("organization_id", organizationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Staff member deleted successfully",
      });

      fetchStaff();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete staff",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      job_title: "",
      department: "",
      employment_type: "owned",
      partner_id: "",
      hire_date: "",
      salary_type: "monthly",
      base_salary: 0,
      tax_id: "",
      bank_name: "",
      bank_account_number: "",
      bank_account_name: "",
      status: "active",
    });
  };

  const openEditDialog = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setFormData({
      full_name: staffMember.full_name,
      email: staffMember.email || "",
      phone: staffMember.phone || "",
      job_title: staffMember.job_title,
      department: staffMember.department || "",
      employment_type: staffMember.employment_type,
      partner_id: staffMember.partner_id || "",
      hire_date: staffMember.hire_date || "",
      salary_type: staffMember.salary_type,
      base_salary: staffMember.base_salary,
      tax_id: staffMember.tax_id || "",
      bank_name: staffMember.bank_name || "",
      bank_account_number: staffMember.bank_account_number || "",
      bank_account_name: staffMember.bank_account_name || "",
      status: staffMember.status,
    });
    setIsEditDialogOpen(true);
  };

  const filteredStaff = staff.filter((s) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.department?.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === "all" || s.employment_type === typeFilter;
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = {
    total: staff.length,
    owned: staff.filter((s) => s.employment_type === "owned").length,
    outsourced: staff.filter((s) => s.employment_type === "outsourced").length,
    active: staff.filter((s) => s.status === "active").length,
    onLeave: staff.filter((s) => s.status === "on_leave").length,
    terminated: staff.filter((s) => s.status === "terminated").length,
  };

  const activeHeadcount = Math.max(stats.active + stats.onLeave, 1);
  const monthlyPayrollCommitment = staff
    .filter((s) => s.status !== "terminated")
    .reduce((sum, s) => sum + Number(s.base_salary || 0), 0);
  const overheadTotal = economics.approvedExpenses + economics.paidPayroll + monthlyPayrollCommitment;
  const revenuePerStaff = stats.total > 0 ? economics.monthRevenue / stats.total : 0;
  const overheadPerActiveStaff = overheadTotal / activeHeadcount;

  const renderForm = () => (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Full Name *</Label>
          <Input
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="John Doe"
          />
        </div>
        <div className="space-y-2">
          <Label>Job Title *</Label>
          <Input
            value={formData.job_title}
            onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
            placeholder="Accountant"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="john@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+234..."
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Department</Label>
          <Input
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            placeholder="Operations"
          />
        </div>
        <div className="space-y-2">
          <Label>Hire Date</Label>
          <Input
            type="date"
            value={formData.hire_date}
            onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Employment Type</Label>
          <Select
            value={formData.employment_type}
            onValueChange={(value: "owned" | "outsourced") =>
              setFormData({ ...formData, employment_type: value, partner_id: "" })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="owned">Owned Staff</SelectItem>
              <SelectItem value="outsourced">Outsourced Staff</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {formData.employment_type === "outsourced" && (
          <div className="space-y-2">
            <Label>Partner Company</Label>
            <Select
              value={formData.partner_id}
              onValueChange={(value) => setFormData({ ...formData, partner_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select partner" />
              </SelectTrigger>
              <SelectContent>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Salary Type</Label>
          <Select
            value={formData.salary_type}
            onValueChange={(value: "monthly" | "bi_monthly" | "hourly") =>
              setFormData({ ...formData, salary_type: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="bi_monthly">Bi-Monthly</SelectItem>
              <SelectItem value="hourly">Hourly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Base Salary (₦)</Label>
          <Input
            type="number"
            value={formData.base_salary || ""}
            onChange={(e) =>
              setFormData({ ...formData, base_salary: parseFloat(e.target.value) || 0 })
            }
            placeholder="100000"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tax ID (TIN)</Label>
          <Input
            value={formData.tax_id}
            onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
            placeholder="TIN Number"
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value: "active" | "on_leave" | "terminated") =>
              setFormData({ ...formData, status: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on_leave">On Leave</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-3">Bank Details</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Bank Name</Label>
            <Input
              value={formData.bank_name}
              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              placeholder="GTBank"
            />
          </div>
          <div className="space-y-2">
            <Label>Account Number</Label>
            <Input
              value={formData.bank_account_number}
              onChange={(e) =>
                setFormData({ ...formData, bank_account_number: e.target.value })
              }
              placeholder="0123456789"
            />
          </div>
          <div className="space-y-2">
            <Label>Account Name</Label>
            <Input
              value={formData.bank_account_name}
              onChange={(e) =>
                setFormData({ ...formData, bank_account_name: e.target.value })
              }
              placeholder="John Doe"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout
      title="Staff Management"
      subtitle="Manage owned and outsourced staff members"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Total Staff
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-success" />
                Owned Staff
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.owned}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4 text-warning" />
                Outsourced Staff
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.outsourced}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-info" />
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-info">{stats.active}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.onLeave} on leave • {stats.terminated} terminated
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Revenue / Staff
            </CardTitle>
            <CardDescription>Current month, org scoped</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenuePerStaff)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(economics.monthRevenue)} revenue across {stats.total} staff
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ReceiptText className="w-4 h-4 text-warning" />
              Overhead / Active Staff
            </CardTitle>
            <CardDescription>Payroll commitment + approved overheads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(overheadPerActiveStaff)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(overheadTotal)} total overhead
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calculator className="w-4 h-4 text-success" />
              Overhead Breakdown
            </CardTitle>
            <CardDescription>Current month snapshot</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Base salaries</span>
              <span className="font-medium">{formatCurrency(monthlyPayrollCommitment)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Approved payroll</span>
              <span className="font-medium">{formatCurrency(economics.paidPayroll)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Approved expenses</span>
              <span className="font-medium">{formatCurrency(economics.approvedExpenses)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between mb-6">
        <div className="flex gap-4 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="owned">Owned</SelectItem>
              <SelectItem value="outsourced">Outsourced</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on_leave">On Leave</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Staff Member</DialogTitle>
              <DialogDescription>
                Add a new owned or outsourced staff member
              </DialogDescription>
            </DialogHeader>
            {renderForm()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddStaff} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Staff
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Staff Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No staff members found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{s.full_name}</p>
                        {s.email && (
                          <p className="text-xs text-muted-foreground">{s.email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{s.job_title}</TableCell>
                    <TableCell>{s.department || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={s.employment_type === "owned" ? "default" : "secondary"}
                      >
                        {s.employment_type === "owned" ? "Owned" : "Outsourced"}
                      </Badge>
                      {s.employment_type === "outsourced" && s.partners?.company_name && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {s.partners.company_name}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{formatCurrency(s.base_salary)}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {s.salary_type.replace("_", "-")}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          s.status === "active"
                            ? "default"
                            : s.status === "on_leave"
                            ? "secondary"
                            : "destructive"
                        }
                        className={
                          s.status === "active"
                            ? "bg-success/20 text-success"
                            : s.status === "on_leave"
                            ? "bg-warning/20 text-warning"
                            : ""
                        }
                      >
                        {s.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(s)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteStaff(s.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription>Update staff member details</DialogDescription>
          </DialogHeader>
          {renderForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStaff} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default StaffPage;