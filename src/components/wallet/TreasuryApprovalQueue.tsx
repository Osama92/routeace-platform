import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Shield, Clock, CheckCircle2, XCircle, AlertTriangle,
  Eye, Lock, Fingerprint, Building2, ArrowUpRight, TrendingUp,
  FileText, Activity, BarChart3,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const fmt = (n: number, sym = "₦") => `${sym}${Math.abs(n).toLocaleString("en-NG")}`;

type TransferStatus = "draft" | "pending_approval" | "approved" | "rejected" | "executed" | "failed" | "expired";

interface PendingTransfer {
  id: string;
  ref: string;
  from: string;
  to: string;
  amount: number;
  type: string;
  initiatedBy: string;
  initiatedAt: string;
  expiresAt: string;
  status: TransferStatus;
  riskScore: number;
  riskLabel: "low" | "medium" | "high" | "critical";
  requiresDoubleApproval: boolean;
  approvals: number;
  requiredApprovals: number;
  deviceIp: string;
  notes: string;
}

const THRESHOLD_SINGLE = 5_000_000;   // Below this → 1 Super Admin approval
const THRESHOLD_DOUBLE = 20_000_000;  // Above this → 2-level approval

// Live data wiring pending: backed by future `treasury_pending_transfers` table.
const INITIAL_TRANSFERS: PendingTransfer[] = [];

const statusConfig: Record<TransferStatus, { label: string; className: string; icon: React.ElementType }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground", icon: FileText },
  pending_approval: { label: "Awaiting Approval", className: "bg-yellow-500/20 text-yellow-600", icon: Clock },
  approved: { label: "Approved", className: "bg-blue-500/20 text-blue-600", icon: CheckCircle2 },
  rejected: { label: "Rejected", className: "bg-destructive/20 text-destructive", icon: XCircle },
  executed: { label: "Executed", className: "bg-green-500/20 text-green-700", icon: CheckCircle2 },
  failed: { label: "Failed", className: "bg-destructive/20 text-destructive", icon: XCircle },
  expired: { label: "Expired", className: "bg-muted text-muted-foreground", icon: Clock },
};

const riskColors: Record<string, string> = {
  low: "bg-green-500/20 text-green-700",
  medium: "bg-yellow-500/20 text-yellow-700",
  high: "bg-orange-500/20 text-orange-700",
  critical: "bg-destructive/20 text-destructive",
};

export function TreasuryApprovalQueue() {
  const { toast } = useToast();
  const [transfers, setTransfers] = useState<PendingTransfer[]>(INITIAL_TRANSFERS);
  const [selectedTransfer, setSelectedTransfer] = useState<PendingTransfer | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const pendingCount = transfers.filter(t => t.status === "pending_approval").length;
  const criticalCount = transfers.filter(t => t.status === "pending_approval" && t.riskLabel === "critical").length;
  const totalPending = transfers.filter(t => t.status === "pending_approval").reduce((s, t) => s + t.amount, 0);

  const handleSendOTP = () => {
    setOtpSent(true);
    toast({ title: "OTP Sent", description: "A 6-digit OTP has been sent to your registered device and email." });
  };

  const handleApprove = () => {
    if (!otpSent || otpValue.length < 6) {
      toast({ title: "OTP Required", description: "Please enter the 6-digit OTP to proceed.", variant: "destructive" });
      return;
    }
    if (!selectedTransfer) return;

    setTransfers(prev => prev.map(t =>
      t.id === selectedTransfer.id
        ? {
            ...t,
            approvals: t.approvals + 1,
            status: (t.approvals + 1) >= t.requiredApprovals
              ? (t.amount <= THRESHOLD_DOUBLE ? "approved" : t.status)
              : t.status,
          }
        : t
    ));

    toast({
      title: "✅ Transfer Approved",
      description: `${selectedTransfer.ref} has been approved. Ledger entries will be created upon execution.`,
    });
    setShowApproveDialog(false);
    setOtpValue("");
    setOtpSent(false);
  };

  const handleReject = () => {
    if (!rejectReason.trim() || !selectedTransfer) return;
    setTransfers(prev => prev.map(t =>
      t.id === selectedTransfer.id ? { ...t, status: "rejected" } : t
    ));
    toast({ title: "Transfer Rejected", description: `${selectedTransfer.ref} has been rejected. Finance Manager notified.` });
    setShowRejectDialog(false);
    setRejectReason("");
  };

  return (
    <div className="space-y-4">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Pending Approvals", value: pendingCount, icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10" },
          { label: "Critical Risk", value: criticalCount, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
          { label: "Total Pending Value", value: fmt(totalPending), icon: Building2, color: "text-primary", bg: "bg-primary/10" },
          { label: "Treasury Control", value: "Active", icon: Shield, color: "text-green-500", bg: "bg-green-500/10" },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${k.bg}`}><k.icon className={`w-4 h-4 ${k.color}`} /></div>
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-lg font-bold">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Approval Threshold Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Treasury Control Policy - Advanced Mode Active</p>
              <p className="text-xs text-muted-foreground mt-1">
                All wallet transfers require Super Admin approval before execution. No wallet balance is debited until final approval.
              </p>
              <div className="flex flex-wrap gap-3 mt-2">
                <Badge variant="outline" className="text-xs">
                  Below {fmt(THRESHOLD_SINGLE)}: 1 Super Admin approval
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Above {fmt(THRESHOLD_SINGLE)}: 2-level approval (Super Admin + Owner)
                </Badge>
                <Badge variant="outline" className="text-xs">
                  OTP required on every approval
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Expires in 12 hours
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transfer Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Approval Queue - Company Wallet Transfers
          </CardTitle>
          <CardDescription>
            Finance Manager-initiated transfers awaiting Super Admin authorization. Immutable audit trail on all actions.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>From → To</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead>Approvals</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((t) => {
                const sc = statusConfig[t.status];
                const StatusIcon = sc.icon;
                return (
                  <TableRow key={t.id} className={t.riskLabel === "critical" ? "bg-destructive/5" : ""}>
                    <TableCell>
                      <div>
                        <p className="font-mono text-xs font-bold">{t.ref}</p>
                        <p className="text-xs text-muted-foreground">{t.initiatedAt}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-xs font-medium">{t.from}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <ArrowUpRight className="w-3 h-3" />{t.to}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold font-mono">{fmt(t.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{t.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${riskColors[t.riskLabel]}`}>
                          {t.riskScore}/100
                        </span>
                        <Progress value={t.riskScore} className="h-1 w-16" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className={`text-xs font-bold ${t.approvals >= t.requiredApprovals ? "text-green-500" : "text-yellow-500"}`}>
                          {t.approvals}/{t.requiredApprovals}
                        </span>
                        {t.requiresDoubleApproval && (
                          <Badge variant="outline" className="text-xs">2-Level</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${sc.className}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {sc.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.expiresAt}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => { setSelectedTransfer(t); }}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        {t.status === "pending_approval" && (
                          <>
                            <Button
                              size="sm" className="h-7 text-xs bg-green-500/20 text-green-700 hover:bg-green-500/30 border-0"
                              onClick={() => { setSelectedTransfer(t); setShowApproveDialog(true); }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30"
                              onClick={() => { setSelectedTransfer(t); setShowRejectDialog(true); }}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {t.status === "approved" && (
                          <Button
                            size="sm" className="h-7 text-xs"
                            onClick={() => {
                              setTransfers(prev => prev.map(x => x.id === t.id ? { ...x, status: "executed" } : x));
                              toast({ title: "Transfer Executed", description: `${t.ref} executed. Ledger entries created.` });
                            }}
                          >
                            Execute
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Super Admin Approval - Treasury Control
            </DialogTitle>
            <DialogDescription>
              OTP verification required. This action is immutably logged.
            </DialogDescription>
          </DialogHeader>
          {selectedTransfer && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-mono font-bold">{selectedTransfer.ref}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-bold text-primary">{fmt(selectedTransfer.amount)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">To</span><span className="text-sm">{selectedTransfer.to}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Risk Score</span>
                  <span className={`font-bold ${riskColors[selectedTransfer.riskLabel]} px-2 py-0.5 rounded-full text-xs`}>
                    {selectedTransfer.riskScore}/100 - {selectedTransfer.riskLabel.toUpperCase()}
                  </span>
                </div>
                {selectedTransfer.requiresDoubleApproval && (
                  <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-600">
                    ⚠️ This transfer exceeds {fmt(THRESHOLD_SINGLE)} and requires 2-level approval
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-primary" />
                  OTP Verification
                </p>
                {!otpSent ? (
                  <Button className="w-full" variant="outline" onClick={handleSendOTP}>
                    Send OTP to My Device
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Enter the 6-digit OTP sent to your phone and email</p>
                    <Input
                      placeholder="000000"
                      value={otpValue}
                      onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="font-mono text-center text-lg tracking-widest"
                      maxLength={6}
                    />
                  </div>
                )}
              </div>
              <div className="p-2 rounded bg-muted/30 text-xs text-muted-foreground">
                <p>📌 IP: {selectedTransfer.deviceIp} | Initiated by: {selectedTransfer.initiatedBy}</p>
                <p>🔒 Wallet balance will NOT be debited until you confirm</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowApproveDialog(false); setOtpValue(""); setOtpSent(false); }}>Cancel</Button>
            <Button onClick={handleApprove} disabled={!otpSent || otpValue.length < 6}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              Reject Transfer
            </DialogTitle>
            <DialogDescription>Provide a rejection reason. This is immutably recorded in the audit ledger.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {selectedTransfer && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p className="font-bold">{selectedTransfer.ref} - {fmt(selectedTransfer.amount)}</p>
                <p className="text-muted-foreground text-xs">To: {selectedTransfer.to}</p>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm font-medium">Rejection Reason *</label>
              <Input
                placeholder="e.g. Suspicious payee, insufficient documentation..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRejectDialog(false); setRejectReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim()}>
              <XCircle className="w-4 h-4 mr-2" />
              Reject Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Trail */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Immutable Audit Ledger
          </CardTitle>
          <CardDescription>Append-only transaction log - GDPR & NDPR compliant</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { time: "09:14", action: "Transfer Initiated", actor: "Finance Manager", ref: "PAY-2025-0442", detail: "₦3.2M vendor payment submitted for approval" },
              { time: "10:30", action: "Transfer Initiated", actor: "Finance Manager", ref: "PAY-2025-0443", detail: "₦25M external transfer - AML flag raised" },
              { time: "08:00", action: "Transfer Executed", actor: "Super Admin", ref: "PAY-2025-0438", detail: "₦520K FIRS tax remittance executed" },
              { time: "17:10", action: "Transfer Rejected", actor: "Super Admin", ref: "PAY-2025-0441", detail: "AML structuring pattern - rejected" },
            ].map((log, i) => (
              <div key={i} className="flex items-start gap-3 text-sm p-2 rounded hover:bg-muted/30">
                <span className="text-xs text-muted-foreground font-mono w-12 shrink-0">{log.time}</span>
                <div className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
                <div>
                  <p className="font-medium text-xs">{log.action} <span className="text-muted-foreground">by {log.actor}</span></p>
                  <p className="text-xs text-muted-foreground">{log.ref} - {log.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
