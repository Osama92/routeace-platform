import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Shield,
  Plus,
  DollarSign,
  TrendingUp,
  CheckCircle,
  Calendar,
  Building2,
  FileText,
  AlertTriangle,
} from "lucide-react";

const SLAInsurancePanel = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isOrgAdmin } = usePermissions();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Fetch insurance policies
  const { data: policies = [], isLoading } = useQuery({
    queryKey: ["sla-insurance-policies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sla_insurance_policies")
        .select("*, customers(company_name), sla_contracts(contract_number)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch customers for dropdown
  const { data: customers = [] } = useQuery({
    queryKey: ["customers-for-insurance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, company_name")
        .order("company_name");
      if (error) throw error;
      return data;
    },
  });

  // Insurance Analytics
  const { data: analytics } = useQuery({
    queryKey: ["sla-insurance-analytics"],
    queryFn: async () => {
      const { data: breaches } = await supabase
        .from("sla_breach_records")
        .select("total_penalty, insurance_coverage_applied, net_penalty_after_insurance")
        .not("insurance_policy_id", "is", null);

      const totalClaimed = breaches?.reduce((sum, b) => sum + (b.insurance_coverage_applied || 0), 0) || 0;
      const totalPenalties = breaches?.reduce((sum, b) => sum + (b.total_penalty || 0), 0) || 0;
      const activePolicies = policies.filter((p: any) => p.is_active).length;
      const totalCoverage = policies.reduce((sum: number, p: any) => sum + (p.coverage_amount_max || 0), 0);

      return {
        totalClaimed,
        totalPenalties,
        activePolicies,
        totalCoverage,
        claimRate: totalPenalties > 0 ? ((totalClaimed / totalPenalties) * 100).toFixed(1) : 0,
      };
    },
    enabled: policies.length > 0,
  });

  // Create policy mutation
  const createPolicy = useMutation({
    mutationFn: async (policyData: any) => {
      const { error } = await supabase
        .from("sla_insurance_policies")
        .insert(policyData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla-insurance-policies"] });
      toast.success("Insurance policy created successfully");
      setCreateDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create policy");
    },
  });

  const handleCreatePolicy = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const policyData = {
      policy_name: formData.get("policy_name"),
      policy_type: formData.get("policy_type"),
      customer_id: formData.get("customer_id") || null,
      coverage_days_max: parseInt(formData.get("coverage_days_max") as string),
      coverage_amount_max: parseFloat(formData.get("coverage_amount_max") as string),
      insurance_fee_type: formData.get("insurance_fee_type"),
      insurance_fee_value: parseFloat(formData.get("insurance_fee_value") as string),
      valid_from: formData.get("valid_from"),
      valid_until: formData.get("valid_until") || null,
      is_active: true,
    };

    createPolicy.mutate(policyData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading flex items-center gap-2">
            <Shield className="w-6 h-6" />
            SLA Insurance
          </h2>
          <p className="text-muted-foreground">
            Protect clients from SLA breach penalties with insurance coverage
          </p>
        </div>
        {(isSuperAdmin || isOrgAdmin) && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Policy
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Insurance Policy</DialogTitle>
                <DialogDescription>
                  Configure SLA breach insurance coverage for clients
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreatePolicy} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="policy_name">Policy Name</Label>
                  <Input id="policy_name" name="policy_name" placeholder="e.g., Premium SLA Coverage" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="policy_type">Policy Type</Label>
                  <Select name="policy_type" defaultValue="per_route">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_route">Per Route</SelectItem>
                      <SelectItem value="contract_level">Contract Level</SelectItem>
                      <SelectItem value="subscription_bundled">Subscription Bundled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer_id">Client (Optional)</Label>
                  <Select name="customer_id">
                    <SelectTrigger>
                      <SelectValue placeholder="All clients (default)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Clients</SelectItem>
                      {customers.map((customer: any) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="coverage_days_max">Max Coverage Days</Label>
                    <Input 
                      id="coverage_days_max" 
                      name="coverage_days_max" 
                      type="number" 
                      defaultValue={2}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="coverage_amount_max">Max Coverage (₦)</Label>
                    <Input 
                      id="coverage_amount_max" 
                      name="coverage_amount_max" 
                      type="number" 
                      defaultValue={100000}
                      required 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="insurance_fee_type">Fee Type</Label>
                    <Select name="insurance_fee_type" defaultValue="percentage">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed (₦)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="insurance_fee_value">Fee Value</Label>
                    <Input 
                      id="insurance_fee_value" 
                      name="insurance_fee_value" 
                      type="number" 
                      step="0.1"
                      defaultValue={2.5}
                      required 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="valid_from">Valid From</Label>
                    <Input 
                      id="valid_from" 
                      name="valid_from" 
                      type="date" 
                      defaultValue={new Date().toISOString().split('T')[0]}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valid_until">Valid Until (Optional)</Label>
                    <Input id="valid_until" name="valid_until" type="date" />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={createPolicy.isPending}>
                    {createPolicy.isPending ? "Creating..." : "Create Policy"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Policies</p>
                <p className="text-2xl font-bold">{analytics?.activePolicies || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Coverage</p>
                <p className="text-2xl font-bold">₦{(analytics?.totalCoverage || 0).toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Claims Paid</p>
                <p className="text-2xl font-bold">₦{(analytics?.totalClaimed || 0).toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Coverage Rate</p>
                <p className="text-2xl font-bold">{analytics?.claimRate || 0}%</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Policies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Insurance Policies</CardTitle>
          <CardDescription>
            Manage SLA breach insurance policies and coverage limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Policy Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Max Coverage</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Valid Period</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((policy: any) => (
                <TableRow key={policy.id}>
                  <TableCell className="font-medium">{policy.policy_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {policy.policy_type.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {policy.customers?.company_name || (
                      <span className="text-muted-foreground">All Clients</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p>₦{policy.coverage_amount_max?.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        Up to {policy.coverage_days_max} days
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {policy.insurance_fee_type === "percentage" 
                      ? `${policy.insurance_fee_value}%`
                      : `₦${policy.insurance_fee_value?.toLocaleString()}`}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="w-3 h-3" />
                      {new Date(policy.valid_from).toLocaleDateString()}
                      {policy.valid_until && ` - ${new Date(policy.valid_until).toLocaleDateString()}`}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={policy.is_active ? "default" : "secondary"}>
                      {policy.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {policies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No insurance policies configured. Create one to offer SLA protection to clients.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Upsell Banner */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">Enable SLA Insurance for Your Clients</h3>
              <p className="text-muted-foreground text-sm">
                Protect your clients from unexpected delivery delays. SLA Insurance automatically 
                covers breach penalties up to the policy limit, improving client satisfaction and retention.
              </p>
            </div>
            <Button>
              Learn More
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SLAInsurancePanel;
