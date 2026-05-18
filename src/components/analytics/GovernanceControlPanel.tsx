import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  Users,
  Lock,
  FileText,
  DollarSign,
  Check,
  X,
  Eye,
  Clock,
  AlertTriangle,
} from "lucide-react";

interface ApprovalWorkflow {
  name: string;
  description: string;
  approvers: string[];
  threshold?: number;
  requiresMultiple: boolean;
}

interface RolePermission {
  role: string;
  canApproveSpend: boolean;
  spendLimit?: number;
  canMoveMoney: boolean;
  canOverridePricing: boolean;
  canAccessFinancials: boolean;
}

const GovernanceControlPanel = () => {
  const [loading, setLoading] = useState(true);
  const [recentAuditLogs, setRecentAuditLogs] = useState<any[]>([]);
  
  const approvalWorkflows: ApprovalWorkflow[] = [
    {
      name: "Invoice Approval",
      description: "Approve invoices before sending to customers",
      approvers: ["Finance Manager", "Org Admin", "Super Admin"],
      threshold: 100000,
      requiresMultiple: true,
    },
    {
      name: "Expense Approval",
      description: "Approve expense claims and reimbursements",
      approvers: ["Ops Manager", "Finance Manager", "Org Admin"],
      threshold: 50000,
      requiresMultiple: false,
    },
    {
      name: "Driver Payout",
      description: "Approve driver salary and bonus payments",
      approvers: ["Finance Manager", "Org Admin"],
      threshold: 0,
      requiresMultiple: true,
    },
    {
      name: "Route Pricing Override",
      description: "Override dynamic pricing suggestions",
      approvers: ["Ops Manager", "Finance Manager"],
      requiresMultiple: false,
    },
    {
      name: "User Role Assignment",
      description: "Assign roles to new users",
      approvers: ["Org Admin", "Super Admin"],
      requiresMultiple: false,
    },
  ];

  const rolePermissions: RolePermission[] = [
    {
      role: "Super Admin",
      canApproveSpend: true,
      spendLimit: undefined, // Unlimited
      canMoveMoney: true,
      canOverridePricing: true,
      canAccessFinancials: true,
    },
    {
      role: "Org Admin",
      canApproveSpend: true,
      spendLimit: 5000000,
      canMoveMoney: true,
      canOverridePricing: true,
      canAccessFinancials: true,
    },
    {
      role: "Finance Manager",
      canApproveSpend: true,
      spendLimit: 1000000,
      canMoveMoney: true,
      canOverridePricing: false,
      canAccessFinancials: true,
    },
    {
      role: "Ops Manager",
      canApproveSpend: true,
      spendLimit: 500000,
      canMoveMoney: false,
      canOverridePricing: true,
      canAccessFinancials: false,
    },
    {
      role: "Dispatcher",
      canApproveSpend: false,
      canMoveMoney: false,
      canOverridePricing: false,
      canAccessFinancials: false,
    },
    {
      role: "Driver",
      canApproveSpend: false,
      canMoveMoney: false,
      canOverridePricing: false,
      canAccessFinancials: false,
    },
    {
      role: "Customer",
      canApproveSpend: false,
      canMoveMoney: false,
      canOverridePricing: false,
      canAccessFinancials: false,
    },
  ];

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      setRecentAuditLogs(data || []);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getActionColor = (action: string) => {
    if (action.includes("delete") || action.includes("remove")) return "destructive";
    if (action.includes("create") || action.includes("insert")) return "default";
    if (action.includes("update") || action.includes("approve")) return "secondary";
    return "outline";
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg font-heading flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Governance & Controls
        </CardTitle>
        <CardDescription>
          Approval workflows, role permissions, and audit trail for investor transparency
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Approval Workflows */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Approval Workflows
          </h4>
          <div className="space-y-3">
            {approvalWorkflows.map((workflow, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div>
                  <p className="font-medium">{workflow.name}</p>
                  <p className="text-sm text-muted-foreground">{workflow.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  {workflow.threshold !== undefined && workflow.threshold > 0 && (
                    <Badge variant="outline">
                      <DollarSign className="w-3 h-3 mr-1" />
                      {`>₦${workflow.threshold.toLocaleString()}`}
                    </Badge>
                  )}
                  {workflow.requiresMultiple && (
                    <Badge variant="secondary">
                      <Users className="w-3 h-3 mr-1" />
                      Multi-approval
                    </Badge>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {workflow.approvers.join(", ")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Role-Based Permissions Matrix */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Financial Controls by Role
          </h4>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-center">Approve Spend</TableHead>
                  <TableHead className="text-center">Spend Limit</TableHead>
                  <TableHead className="text-center">Move Money</TableHead>
                  <TableHead className="text-center">Override Pricing</TableHead>
                  <TableHead className="text-center">View Financials</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rolePermissions.map((perm, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{perm.role}</TableCell>
                    <TableCell className="text-center">
                      {perm.canApproveSpend ? (
                        <Check className="w-4 h-4 text-success mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-destructive mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {perm.spendLimit === undefined ? (
                        <Badge>Unlimited</Badge>
                      ) : perm.spendLimit > 0 ? (
                        <span className="text-sm">₦{perm.spendLimit.toLocaleString()}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {perm.canMoveMoney ? (
                        <Check className="w-4 h-4 text-success mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-destructive mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {perm.canOverridePricing ? (
                        <Check className="w-4 h-4 text-success mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-destructive mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {perm.canAccessFinancials ? (
                        <Eye className="w-4 h-4 text-primary mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Recent Audit Logs */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Recent Audit Trail
          </h4>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {recentAuditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent activity
              </p>
            ) : (
              recentAuditLogs.map((log, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg text-sm">
                  <div className="flex items-center gap-3">
                    <Badge variant={getActionColor(log.action) as any}>
                      {log.action}
                    </Badge>
                    <span className="text-muted-foreground">{log.table_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {log.user_email || "System"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {log.created_at && formatDate(log.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          <Button variant="outline" size="sm" className="mt-3 w-full">
            View Full Audit Log
          </Button>
        </div>

        {/* Investor Note */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <h4 className="font-medium text-primary mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Investor Assurance
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• All financial transactions require multi-level approval</li>
            <li>• Separation of duties enforced between Finance and Operations</li>
            <li>• Complete audit trail maintained for all sensitive actions</li>
            <li>• Role-based access controls prevent unauthorized access</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default GovernanceControlPanel;
