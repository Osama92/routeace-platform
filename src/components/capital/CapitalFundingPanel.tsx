import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Wallet,
  Plus,
  Building2,
  User,
  Percent,
  TrendingUp,
  Calendar,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react";
import { format, addMonths } from "date-fns";

interface CapitalFunding {
  id: string;
  funding_type: string;
  investor_name: string;
  investor_type: string;
  amount: number;
  interest_rate_annual: number;
  tenure_months: number;
  repayment_type: string;
  wht_rate: number;
  start_date: string;
  status: string;
  total_repaid: number;
  next_payment_date?: string;
}

interface RepaymentSchedule {
  payment_number: number;
  due_date: string;
  principal_amount: number;
  interest_amount: number;
  wht_amount: number;
  net_payable: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0
  }).format(amount);
};

// Calculate monthly interest payment with WHT
const calculateMonthlyPayment = (
  principal: number,
  annualRate: number,
  whtRate: number = 10
): { gross: number; wht: number; net: number } => {
  const monthlyRate = annualRate / 100 / 12;
  const grossInterest = principal * monthlyRate;
  const wht = grossInterest * (whtRate / 100);
  const net = grossInterest - wht;
  return { gross: grossInterest, wht, net };
};

// Generate repayment schedule
const generateSchedule = (
  principal: number,
  annualRate: number,
  tenureMonths: number,
  startDate: Date,
  whtRate: number,
  repaymentType: string
): RepaymentSchedule[] => {
  const schedule: RepaymentSchedule[] = [];
  
  for (let i = 1; i <= tenureMonths; i++) {
    const payment = calculateMonthlyPayment(principal, annualRate, whtRate);
    const principalPart = repaymentType === "bullet" && i === tenureMonths ? principal : 0;
    
    schedule.push({
      payment_number: i,
      due_date: format(addMonths(startDate, i), "yyyy-MM-dd"),
      principal_amount: principalPart,
      interest_amount: payment.gross,
      wht_amount: payment.wht,
      net_payable: payment.net + principalPart
    });
  }
  
  return schedule;
};

const CapitalFundingPanel = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedFunding, setSelectedFunding] = useState<CapitalFunding | null>(null);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  
  const [form, setForm] = useState({
    funding_type: "debt",
    investor_name: "",
    investor_type: "individual",
    amount: "",
    interest_rate_annual: "30",
    tenure_months: "12",
    repayment_type: "monthly",
    wht_rate: "10",
    start_date: format(new Date(), "yyyy-MM-dd"),
    notes: ""
  });

  // Fetch capital funding records
  const { data: fundings } = useQuery({
    queryKey: ["capital-fundings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("capital_funding")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as CapitalFunding[];
    }
  });

  // Create funding mutation
  const createFundingMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("capital_funding").insert({
        funding_type: form.funding_type,
        investor_name: form.investor_name,
        investor_type: form.investor_type,
        amount: parseFloat(form.amount),
        interest_rate_annual: parseFloat(form.interest_rate_annual),
        tenure_months: parseInt(form.tenure_months),
        repayment_type: form.repayment_type,
        wht_rate: parseFloat(form.wht_rate),
        start_date: form.start_date,
        status: "active",
        next_payment_date: addMonths(new Date(form.start_date), 1).toISOString(),
        notes: form.notes,
        created_by: user?.id
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capital-fundings"] });
      toast({ title: "Success", description: "Capital funding record created" });
      setAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setForm({
      funding_type: "debt",
      investor_name: "",
      investor_type: "individual",
      amount: "",
      interest_rate_annual: "30",
      tenure_months: "12",
      repayment_type: "monthly",
      wht_rate: "10",
      start_date: format(new Date(), "yyyy-MM-dd"),
      notes: ""
    });
  };

  const openSchedule = (funding: CapitalFunding) => {
    setSelectedFunding(funding);
    setScheduleDialogOpen(true);
  };

  // Summary calculations
  const totalEquity = fundings?.filter(f => f.funding_type === "equity").reduce((sum, f) => sum + f.amount, 0) || 0;
  const totalDebt = fundings?.filter(f => f.funding_type === "debt").reduce((sum, f) => sum + f.amount, 0) || 0;
  const activeFundings = fundings?.filter(f => f.status === "active").length || 0;
  const monthlyInterestPayable = fundings?.filter(f => f.status === "active" && f.funding_type === "debt")
    .reduce((sum, f) => sum + calculateMonthlyPayment(f.amount, f.interest_rate_annual, f.wht_rate).net, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Equity</p>
              <p className="text-2xl font-bold">{formatCurrency(totalEquity)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Wallet className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Debt</p>
              <p className="text-2xl font-bold">{formatCurrency(totalDebt)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Calendar className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Contracts</p>
              <p className="text-2xl font-bold">{activeFundings}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <CreditCard className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Interest (Net)</p>
              <p className="text-2xl font-bold">{formatCurrency(monthlyInterestPayable)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="overview">All Funding</TabsTrigger>
            <TabsTrigger value="equity">Equity</TabsTrigger>
            <TabsTrigger value="debt">Debt</TabsTrigger>
          </TabsList>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Capital
          </Button>
        </div>

        <TabsContent value="overview">
          <FundingTable fundings={fundings || []} onViewSchedule={openSchedule} />
        </TabsContent>
        <TabsContent value="equity">
          <FundingTable fundings={fundings?.filter(f => f.funding_type === "equity") || []} onViewSchedule={openSchedule} />
        </TabsContent>
        <TabsContent value="debt">
          <FundingTable fundings={fundings?.filter(f => f.funding_type === "debt") || []} onViewSchedule={openSchedule} />
        </TabsContent>
      </Tabs>

      {/* Add Funding Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Capital / Funding</DialogTitle>
            <DialogDescription>Record equity investment or debt funding</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Funding Type</Label>
                <Select value={form.funding_type} onValueChange={(v) => setForm(prev => ({ ...prev, funding_type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equity">Equity</SelectItem>
                    <SelectItem value="debt">Debt</SelectItem>
                    <SelectItem value="grant">Grant</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Investor Type</Label>
                <Select value={form.investor_type} onValueChange={(v) => setForm(prev => ({ ...prev, investor_type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="vc">Venture Capital</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Investor / Lender Name</Label>
              <Input
                value={form.investor_name}
                onChange={(e) => setForm(prev => ({ ...prev, investor_name: e.target.value }))}
                placeholder="e.g., Daniel Bast"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (₦)</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="30000000"
                />
              </div>
              <div className="space-y-2">
                <Label>Annual Interest Rate (%)</Label>
                <Input
                  type="number"
                  value={form.interest_rate_annual}
                  onChange={(e) => setForm(prev => ({ ...prev, interest_rate_annual: e.target.value }))}
                  placeholder="30"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tenure (Months)</Label>
                <Input
                  type="number"
                  value={form.tenure_months}
                  onChange={(e) => setForm(prev => ({ ...prev, tenure_months: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>WHT Rate (%)</Label>
                <Input
                  type="number"
                  value={form.wht_rate}
                  onChange={(e) => setForm(prev => ({ ...prev, wht_rate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Repayment</Label>
                <Select value={form.repayment_type} onValueChange={(v) => setForm(prev => ({ ...prev, repayment_type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="deferred">Deferred</SelectItem>
                    <SelectItem value="bullet">Bullet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm(prev => ({ ...prev, start_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional terms or notes..."
              />
            </div>
            
            {/* Preview */}
            {form.amount && form.interest_rate_annual && (
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm font-medium mb-2">Monthly Payment Preview</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Gross Interest:</span>
                    <p className="font-medium">{formatCurrency(calculateMonthlyPayment(parseFloat(form.amount) || 0, parseFloat(form.interest_rate_annual) || 0, parseFloat(form.wht_rate) || 10).gross)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">WHT Deduction:</span>
                    <p className="font-medium text-red-500">-{formatCurrency(calculateMonthlyPayment(parseFloat(form.amount) || 0, parseFloat(form.interest_rate_annual) || 0, parseFloat(form.wht_rate) || 10).wht)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Net Payable:</span>
                    <p className="font-medium text-green-600">{formatCurrency(calculateMonthlyPayment(parseFloat(form.amount) || 0, parseFloat(form.interest_rate_annual) || 0, parseFloat(form.wht_rate) || 10).net)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createFundingMutation.mutate()} disabled={!form.investor_name || !form.amount}>
              Save Capital Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Repayment Schedule</DialogTitle>
            <DialogDescription>
              {selectedFunding?.investor_name} - {formatCurrency(selectedFunding?.amount || 0)}
            </DialogDescription>
          </DialogHeader>
          {selectedFunding && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Gross Interest</TableHead>
                  <TableHead>WHT</TableHead>
                  <TableHead>Net Payable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generateSchedule(
                  selectedFunding.amount,
                  selectedFunding.interest_rate_annual,
                  selectedFunding.tenure_months,
                  new Date(selectedFunding.start_date),
                  selectedFunding.wht_rate,
                  selectedFunding.repayment_type
                ).map((payment) => (
                  <TableRow key={payment.payment_number}>
                    <TableCell>{payment.payment_number}</TableCell>
                    <TableCell>{format(new Date(payment.due_date), "MMM yyyy")}</TableCell>
                    <TableCell>{formatCurrency(payment.interest_amount)}</TableCell>
                    <TableCell className="text-red-500">-{formatCurrency(payment.wht_amount)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(payment.net_payable)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Funding Table Component
const FundingTable = ({ fundings, onViewSchedule }: { fundings: CapitalFunding[], onViewSchedule: (f: CapitalFunding) => void }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case "repaid": return <Badge variant="secondary">Repaid</Badge>;
      case "defaulted": return <Badge variant="destructive">Defaulted</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Investor</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Tenure</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fundings.map((funding) => (
              <TableRow key={funding.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {funding.investor_type === "company" || funding.investor_type === "bank" ? (
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <User className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">{funding.investor_name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">{funding.funding_type}</Badge>
                </TableCell>
                <TableCell className="font-medium">{formatCurrency(funding.amount)}</TableCell>
                <TableCell>{funding.interest_rate_annual}% p.a.</TableCell>
                <TableCell>{funding.tenure_months} months</TableCell>
                <TableCell>{getStatusBadge(funding.status)}</TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => onViewSchedule(funding)}>
                    <Calendar className="w-3 h-3 mr-1" />
                    Schedule
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {fundings.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No funding records yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default CapitalFundingPanel;
