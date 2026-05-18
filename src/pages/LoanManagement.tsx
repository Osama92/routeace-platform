import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { RequirePermission } from "@/components/rbac/RequirePermission";
import {
  Wallet,
  Plus,
  Building2,
  User,
  Percent,
  CheckCircle,
  TrendingUp,
  AlertTriangle
} from "lucide-react";
import { format, addMonths } from "date-fns";

interface Lender {
  id: string;
  name: string;
  lender_type: "individual" | "company";
  contact_name: string | null;
  contact_email: string | null;
  is_active: boolean;
}

interface Loan {
  id: string;
  lender_id: string;
  lender_name: string;
  principal_amount: number;
  annual_interest_rate: number;
  tenure_months: number;
  start_date: string;
  wht_rate: number;
  status: string;
}

interface LoanScheduleItem {
  month_number: number;
  due_date: string;
  gross_interest: number;
  wht_deduction: number;
  net_payable: number;
  cumulative_interest: number;
}

// Loan & lender records are persisted to Supabase (loan_lenders, loans) with org-scoped RLS.


// Loan calculation helper
const calculateLoanSchedule = (
  principal: number,
  annualRate: number,
  tenureMonths: number,
  startDate: Date,
  whtRate: number = 10
): LoanScheduleItem[] => {
  const monthlyRate = annualRate / 100 / 12;
  const schedule: LoanScheduleItem[] = [];
  let cumulativeInterest = 0;

  for (let i = 1; i <= tenureMonths; i++) {
    const grossInterest = principal * monthlyRate;
    const whtDeduction = grossInterest * (whtRate / 100);
    const netPayable = grossInterest - whtDeduction;
    cumulativeInterest += grossInterest;

    schedule.push({
      month_number: i,
      due_date: format(addMonths(startDate, i), "yyyy-MM-dd"),
      gross_interest: Math.round(grossInterest * 100) / 100,
      wht_deduction: Math.round(whtDeduction * 100) / 100,
      net_payable: Math.round(netPayable * 100) / 100,
      cumulative_interest: Math.round(cumulativeInterest * 100) / 100
    });
  }

  return schedule;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0
  }).format(amount);
};

const LoanManagement = () => {
  const { toast } = useToast();
  const { user, organizationId } = useAuth() as any;
  const [activeTab, setActiveTab] = useState("loans");
  const [lenderDialogOpen, setLenderDialogOpen] = useState(false);
  const [loanDialogOpen, setLoanDialogOpen] = useState(false);
  const [previewSchedule, setPreviewSchedule] = useState<LoanScheduleItem[]>([]);

  const [lenders, setLenders] = useState<Lender[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(false);

  // Lender form state
  const [lenderForm, setLenderForm] = useState({
    name: "",
    lender_type: "company" as "individual" | "company",
    contact_name: "",
    contact_email: ""
  });

  // Loan form state
  const [loanForm, setLoanForm] = useState({
    lender_id: "",
    principal_amount: "",
    annual_interest_rate: "35",
    tenure_months: "18",
    start_date: format(new Date(), "yyyy-MM-dd"),
    wht_rate: "10"
  });

  // Fetch lenders + loans from Supabase
  const fetchAll = async () => {
    if (!organizationId) return;
    setLoading(true);
    const [lendersRes, loansRes] = await Promise.all([
      supabase
        .from("loan_lenders" as any)
        .select("id, name, lender_type, contact_name, contact_email, is_active")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false }),
      supabase
        .from("loans" as any)
        .select("id, lender_id, principal_amount, annual_interest_rate, tenure_months, start_date, wht_rate, status, loan_lenders(name)")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false }),
    ]);
    if (lendersRes.error) {
      toast({ title: "Failed to load lenders", description: lendersRes.error.message, variant: "destructive" });
    } else {
      setLenders((lendersRes.data || []) as any);
    }
    if (loansRes.error) {
      toast({ title: "Failed to load loans", description: loansRes.error.message, variant: "destructive" });
    } else {
      const mapped = (loansRes.data || []).map((r: any) => ({
        id: r.id,
        lender_id: r.lender_id,
        lender_name: r.loan_lenders?.name ?? "",
        principal_amount: Number(r.principal_amount),
        annual_interest_rate: Number(r.annual_interest_rate),
        tenure_months: r.tenure_months,
        start_date: r.start_date,
        wht_rate: Number(r.wht_rate),
        status: r.status,
      })) as Loan[];
      setLoans(mapped);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [organizationId]);

  // Create lender
  const handleCreateLender = async () => {
    if (!organizationId) {
      toast({ title: "No organization", description: "Sign in to an organization first.", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase
      .from("loan_lenders" as any)
      .insert({
        organization_id: organizationId,
        name: lenderForm.name,
        lender_type: lenderForm.lender_type,
        contact_name: lenderForm.contact_name || null,
        contact_email: lenderForm.contact_email || null,
        is_active: true,
        created_by: user?.id ?? null,
      })
      .select("id, name, lender_type, contact_name, contact_email, is_active")
      .single();
    if (error) {
      toast({ title: "Failed to add lender", description: error.message, variant: "destructive" });
      return;
    }
    setLenders((prev) => [data as any, ...prev]);
    toast({ title: "Success", description: "Lender created successfully" });
    setLenderDialogOpen(false);
    setLenderForm({ name: "", lender_type: "company", contact_name: "", contact_email: "" });
  };

  // Create loan
  const handleCreateLoan = async () => {
    const lender = lenders.find(l => l.id === loanForm.lender_id);
    if (!lender || !organizationId) return;

    const { data, error } = await supabase
      .from("loans" as any)
      .insert({
        organization_id: organizationId,
        lender_id: loanForm.lender_id,
        principal_amount: parseFloat(loanForm.principal_amount),
        annual_interest_rate: parseFloat(loanForm.annual_interest_rate),
        tenure_months: parseInt(loanForm.tenure_months),
        start_date: loanForm.start_date,
        wht_rate: parseFloat(loanForm.wht_rate),
        status: "active",
        created_by: user?.id ?? null,
      })
      .select("id, lender_id, principal_amount, annual_interest_rate, tenure_months, start_date, wht_rate, status")
      .single();
    if (error) {
      toast({ title: "Failed to create loan", description: error.message, variant: "destructive" });
      return;
    }
    const row = data as any;
    setLoans((prev) => [{
      id: row.id,
      lender_id: row.lender_id,
      lender_name: lender.name,
      principal_amount: Number(row.principal_amount),
      annual_interest_rate: Number(row.annual_interest_rate),
      tenure_months: row.tenure_months,
      start_date: row.start_date,
      wht_rate: Number(row.wht_rate),
      status: row.status,
    }, ...prev]);

    toast({ title: "Success", description: "Loan created with payment schedule" });
    setLoanDialogOpen(false);
    setLoanForm({
      lender_id: "",
      principal_amount: "",
      annual_interest_rate: "35",
      tenure_months: "18",
      start_date: format(new Date(), "yyyy-MM-dd"),
      wht_rate: "10"
    });
    setPreviewSchedule([]);
  };

  // Calculate preview
  const handlePreview = () => {
    if (!loanForm.principal_amount || !loanForm.annual_interest_rate || !loanForm.tenure_months) return;
    
    const schedule = calculateLoanSchedule(
      parseFloat(loanForm.principal_amount),
      parseFloat(loanForm.annual_interest_rate),
      parseInt(loanForm.tenure_months),
      new Date(loanForm.start_date),
      parseFloat(loanForm.wht_rate)
    );
    setPreviewSchedule(schedule);
  };

  // Summary calculations
  const totalPrincipal = loans.reduce((sum, l) => sum + l.principal_amount, 0);
  const activeLoans = loans.filter(l => l.status === "active").length;

  return (
    <DashboardLayout title="Loan Management" subtitle="Manage lenders, loans, and interest calculations">
      <RequirePermission 
        permissions={["PAYOUTS_VIEW", "ANALYTICS_VIEW_FINANCIAL"]} 
        fallback={
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
              <p className="text-muted-foreground">You need Finance or Admin access to view this page.</p>
            </CardContent>
          </Card>
        }
      >
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Principal</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalPrincipal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Loans</p>
                  <p className="text-2xl font-bold">{activeLoans}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Building2 className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Lenders</p>
                  <p className="text-2xl font-bold">{lenders.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Percent className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">WHT Rate</p>
                  <p className="text-2xl font-bold">10%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="loans">Loans</TabsTrigger>
            <TabsTrigger value="lenders">Lenders</TabsTrigger>
            <TabsTrigger value="schedules">Payment Schedules</TabsTrigger>
          </TabsList>

          {/* Loans Tab */}
          <TabsContent value="loans">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Loan Portfolio</CardTitle>
                    <CardDescription>Manage active and completed loans</CardDescription>
                  </div>
                  <Button onClick={() => setLoanDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Loan
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lender</TableHead>
                      <TableHead>Principal</TableHead>
                      <TableHead>Rate (Annual)</TableHead>
                      <TableHead>Tenure</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loans.map((loan) => (
                      <TableRow key={loan.id}>
                        <TableCell className="font-medium">{loan.lender_name}</TableCell>
                        <TableCell>{formatCurrency(loan.principal_amount)}</TableCell>
                        <TableCell>{loan.annual_interest_rate}%</TableCell>
                        <TableCell>{loan.tenure_months} months</TableCell>
                        <TableCell>{format(new Date(loan.start_date), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <Badge variant={loan.status === "active" ? "default" : "secondary"}>
                            {loan.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {loans.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No loans found. Click "New Loan" to create one.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lenders Tab */}
          <TabsContent value="lenders">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Registered Lenders</CardTitle>
                    <CardDescription>Individuals and companies providing loans</CardDescription>
                  </div>
                  <Button onClick={() => setLenderDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Lender
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lenders.map((lender) => (
                      <TableRow key={lender.id}>
                        <TableCell className="font-medium">{lender.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {lender.lender_type === "company" ? (
                              <Building2 className="w-3 h-3 mr-1" />
                            ) : (
                              <User className="w-3 h-3 mr-1" />
                            )}
                            {lender.lender_type}
                          </Badge>
                        </TableCell>
                        <TableCell>{lender.contact_name || "-"}</TableCell>
                        <TableCell>{lender.contact_email || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={lender.is_active ? "default" : "secondary"}>
                            {lender.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {lenders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No lenders found. Click "Add Lender" to register one.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schedules Tab */}
          <TabsContent value="schedules">
            <Card>
              <CardHeader>
                <CardTitle>Payment Schedules</CardTitle>
                <CardDescription>Monthly interest payments and WHT deductions</CardDescription>
              </CardHeader>
              <CardContent>
                {loans.length > 0 ? (
                  <div className="space-y-6">
                    {loans.map(loan => {
                      const schedule = calculateLoanSchedule(
                        loan.principal_amount,
                        loan.annual_interest_rate,
                        loan.tenure_months,
                        new Date(loan.start_date),
                        loan.wht_rate
                      );
                      return (
                        <div key={loan.id} className="border rounded-lg p-4">
                          <h4 className="font-medium mb-3">{loan.lender_name} - {formatCurrency(loan.principal_amount)}</h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Month</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Gross Interest</TableHead>
                                <TableHead>WHT</TableHead>
                                <TableHead>Net Payable</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {schedule.slice(0, 6).map((s) => (
                                <TableRow key={s.month_number}>
                                  <TableCell>{s.month_number}</TableCell>
                                  <TableCell>{format(new Date(s.due_date), "MMM yyyy")}</TableCell>
                                  <TableCell>{formatCurrency(s.gross_interest)}</TableCell>
                                  <TableCell className="text-red-500">-{formatCurrency(s.wht_deduction)}</TableCell>
                                  <TableCell className="font-medium">{formatCurrency(s.net_payable)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {schedule.length > 6 && (
                            <p className="text-sm text-muted-foreground mt-2">
                              ... and {schedule.length - 6} more payments
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No loans created yet. Create a loan to view its payment schedule.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Lender Dialog */}
        <Dialog open={lenderDialogOpen} onOpenChange={setLenderDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Lender</DialogTitle>
              <DialogDescription>Register a new individual or company lender</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Lender Name</Label>
                <Input
                  value={lenderForm.name}
                  onChange={(e) => setLenderForm({ ...lenderForm, name: e.target.value })}
                  placeholder="Enter lender name"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={lenderForm.lender_type}
                  onValueChange={(v) => setLenderForm({ ...lenderForm, lender_type: v as "individual" | "company" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Name</Label>
                  <Input
                    value={lenderForm.contact_name}
                    onChange={(e) => setLenderForm({ ...lenderForm, contact_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input
                    type="email"
                    value={lenderForm.contact_email}
                    onChange={(e) => setLenderForm({ ...lenderForm, contact_email: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLenderDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateLender} disabled={!lenderForm.name}>Add Lender</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Loan Dialog */}
        <Dialog open={loanDialogOpen} onOpenChange={setLoanDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Loan</DialogTitle>
              <DialogDescription>Enter loan details and preview payment schedule</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lender</Label>
                <Select
                  value={loanForm.lender_id}
                  onValueChange={(v) => setLoanForm({ ...loanForm, lender_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select lender" />
                  </SelectTrigger>
                  <SelectContent>
                    {lenders.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Principal Amount (₦)</Label>
                <Input
                  type="number"
                  value={loanForm.principal_amount}
                  onChange={(e) => setLoanForm({ ...loanForm, principal_amount: e.target.value })}
                  placeholder="20000000"
                />
              </div>
              <div className="space-y-2">
                <Label>Annual Interest Rate (%)</Label>
                <Input
                  type="number"
                  value={loanForm.annual_interest_rate}
                  onChange={(e) => setLoanForm({ ...loanForm, annual_interest_rate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tenure (Months)</Label>
                <Input
                  type="number"
                  value={loanForm.tenure_months}
                  onChange={(e) => setLoanForm({ ...loanForm, tenure_months: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={loanForm.start_date}
                  onChange={(e) => setLoanForm({ ...loanForm, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>WHT Rate (%)</Label>
                <Input
                  type="number"
                  value={loanForm.wht_rate}
                  onChange={(e) => setLoanForm({ ...loanForm, wht_rate: e.target.value })}
                />
              </div>
            </div>

            <Button variant="outline" onClick={handlePreview} className="mt-4">
              Preview Schedule
            </Button>

            {previewSchedule.length > 0 && (
              <div className="mt-4 max-h-48 overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Gross Interest</TableHead>
                      <TableHead>WHT</TableHead>
                      <TableHead>Net Payable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewSchedule.slice(0, 6).map((s) => (
                      <TableRow key={s.month_number}>
                        <TableCell>{s.month_number}</TableCell>
                        <TableCell>{format(new Date(s.due_date), "MMM yyyy")}</TableCell>
                        <TableCell>{formatCurrency(s.gross_interest)}</TableCell>
                        <TableCell className="text-red-500">-{formatCurrency(s.wht_deduction)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(s.net_payable)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setLoanDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateLoan} disabled={!loanForm.lender_id || !loanForm.principal_amount}>
                Create Loan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </RequirePermission>
    </DashboardLayout>
  );
};

export default LoanManagement;
