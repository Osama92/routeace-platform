import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useIsPaidPlan } from "@/hooks/useIsPaidPlan";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Wallet, Receipt, TrendingDown, ShieldCheck,
  AlertTriangle, Lock, Banknote, FileWarning, Sparkles, ScrollText,
} from "lucide-react";
import { Link } from "react-router-dom";
import ARDrilldownPanel from "@/components/cfo/ARDrilldownPanel";
import APDrilldownPanel from "@/components/cfo/APDrilldownPanel";
import ExpenseApprovalAI from "@/components/cfo/ExpenseApprovalAI";
import CFOAuditPanel from "@/components/cfo/CFOAuditPanel";
import { recordCfoEvent } from "@/lib/cfoAudit";

type CFOSnapshot = {
  cashPosition: number;
  receivablesTotal: number;
  receivablesOverdue: number;
  payablesTotal: number;
  revenueMTD: number;
  unsafeRoutesCount: number;
  pendingApprovalsCount: number;
};

const initial: CFOSnapshot = {
  cashPosition: 0, receivablesTotal: 0, receivablesOverdue: 0,
  payablesTotal: 0, revenueMTD: 0, unsafeRoutesCount: 0, pendingApprovalsCount: 0,
};

export default function AICFOEngine() {
  const navigate = useNavigate();
  const { isPaid, loading: planLoading } = useIsPaidPlan();
  const [snap, setSnap] = useState<CFOSnapshot>(initial);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const [arRes, apRes, invRes] = await Promise.all([
          supabase.from("accounts_receivable").select("balance, due_date, status"),
          supabase.from("accounts_payable").select("balance, status"),
          supabase.from("invoices").select("total_amount, invoice_date, status").gte("invoice_date", monthStart.toISOString().slice(0, 10)),
        ]);

        const ar = arRes.data || [];
        const ap = apRes.data || [];
        const inv = invRes.data || [];
        const today = new Date().toISOString().slice(0, 10);

        const receivablesTotal = ar.reduce((s, r: any) => s + Number(r.balance || 0), 0);
        const receivablesOverdue = ar
          .filter((r: any) => r.due_date && r.due_date < today && r.status !== "paid")
          .reduce((s, r: any) => s + Number(r.balance || 0), 0);
        const payablesTotal = ap
          .filter((r: any) => r.status !== "paid")
          .reduce((s, r: any) => s + Number(r.balance || 0), 0);
        const revenueMTD = inv
          .filter((r: any) => r.status !== "cancelled")
          .reduce((s, r: any) => s + Number(r.total_amount || 0), 0);

        setSnap({
          cashPosition: revenueMTD - payablesTotal,
          receivablesTotal,
          receivablesOverdue,
          payablesTotal,
          revenueMTD,
          unsafeRoutesCount: 0,
          pendingApprovalsCount: 0,
        });
      } catch (e) {
        console.error("[AICFO] load error", e);
      } finally {
        setLoading(false);
      }
    };
    if (isPaid) {
      load();
      recordCfoEvent({ moduleKey: "ai_cfo_engine", eventType: "view" });
    } else {
      setLoading(false);
    }
  }, [isPaid]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

  if (planLoading) {
    return (
      <DashboardLayout title="AI CFO Engine" subtitle="Strategic financial command layer">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </DashboardLayout>
    );
  }

  if (!isPaid) {
    return (
      <DashboardLayout title="AI CFO Engine" subtitle="Strategic financial command layer">
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2 -ml-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <Alert>
            <Lock className="w-4 h-4" />
            <AlertTitle>Available on a paid plan</AlertTitle>
            <AlertDescription>
              The AI CFO Engine controls cash, AR, cost optimization, and profit protection.
              Upgrade your plan to unlock real-time financial intelligence.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="AI CFO Engine" subtitle="Strategic financial command layer">
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2 -ml-2">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Button>

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-primary" /> AI CFO Engine
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">
              Read-only observatory aggregating cash, receivables, cost, and profit signals.
              Acts above Finance Manager - actions remain gated by Super Admin approval.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1">
              <Link to="/ledger-viewer" onClick={() => recordCfoEvent({ moduleKey: "ai_cfo_engine", eventType: "click", metadata: { target: "ledger_viewer" } })}>
                <ScrollText className="w-3 h-3" /> Ledger Viewer
              </Link>
            </Button>
            <Badge variant="outline" className="gap-1"><ShieldCheck className="w-3 h-3" /> Observatory v1</Badge>
          </div>
        </div>

        {/* AR + AP Drilldowns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ARDrilldownPanel />
          <APDrilldownPanel />
        </div>

        {/* Write-side: Expense Approval AI + Audit Trail */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ExpenseApprovalAI />
          <CFOAuditPanel />
        </div>

        {/* Scoreboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" /> Cash Position
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "…" : fmt(snap.cashPosition)}</div>
              <CardDescription>Revenue MTD − open payables</CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" /> Receivables
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "…" : fmt(snap.receivablesTotal)}</div>
              <CardDescription className="text-warning">
                {loading ? "" : `${fmt(snap.receivablesOverdue)} overdue`}
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Banknote className="w-4 h-4 text-primary" /> Payables Open
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "…" : fmt(snap.payablesTotal)}</div>
              <CardDescription>Outstanding vendor bills</CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-primary" /> Revenue MTD
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "…" : fmt(snap.revenueMTD)}</div>
              <CardDescription>Posted invoices this month</CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* CFO modules grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" /> Cash Control Engine
              </CardTitle>
              <CardDescription>Monitor inflow / outflow, flag liquidity risks</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div>Net runway signal: <strong>{loading ? "…" : fmt(snap.cashPosition)}</strong></div>
              <p className="text-xs text-muted-foreground">
                Pointer: wire to <code>autonomous_decisions</code> with <code>decision_type='delay_expense'</code> for autonomous holds.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileWarning className="w-4 h-4 text-primary" /> Receivables Enforcement (AR AI)
              </CardTitle>
              <CardDescription>Aggressive collections + risk reduction</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div>Overdue exposure: <strong className="text-warning">{loading ? "…" : fmt(snap.receivablesOverdue)}</strong></div>
              <p className="text-xs text-muted-foreground">
                Collections reminders are dispatched automatically once an invoice ages past 30 days.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-primary" /> Cost Optimization
              </CardTitle>
              <CardDescription>Fuel, maintenance, ops waste</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="text-xs text-muted-foreground">
                Pointer: read from <code>fuel_efficiency_logs</code> + <code>maintenance_records</code>; surface variance &gt; threshold.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> Profit Protection
              </CardTitle>
              <CardDescription>Stop loss-making routes early</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="text-xs text-muted-foreground">
                Pointer: join <code>dispatches</code> + <code>asset_profitability</code> per route; suspend when margin &lt; 0 over 7d window.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-primary" /> Expense Approval AI
              </CardTitle>
              <CardDescription>Gate before money leaves the system</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="text-xs text-muted-foreground">
                Pointer: extend <code>approvals</code> table with <code>cfo_recommendation</code>; Super Admin retains final approval.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Daily CFO Brief
              </CardTitle>
              <CardDescription>Email + WhatsApp to Super Admin</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="text-xs text-muted-foreground">
                Pointer: schedule <code>cfo-daily-brief</code> edge function via <code>pg_cron</code> (07:00 tenant-local).
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
