/**
 * Reseller Scope Self-Check
 * Shows the exact org boundary a reseller can access in LC and runs a
 * one-click probe against scoped tables. Every probe writes to
 * reseller_access_log for compliance.
 */
import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle2, XCircle, Loader2, PlayCircle } from "lucide-react";
import { useResellerGuard } from "@/hooks/useResellerGuard";
import { useResellerAudit } from "@/hooks/useResellerAudit";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ProbeResult {
  table: string;
  scope: string;
  rows: number | null;
  error: string | null;
  outcome: "allowed" | "denied";
}

const SCOPED_TABLES: { table: string; scope: string }[] = [
  { table: "white_label_resellers", scope: "Listings you onboarded" },
  { table: "reseller_sales", scope: "Sales for your listings" },
  { table: "reseller_payouts", scope: "Payouts to your org" },
  { table: "commission_ledger", scope: "Commissions you earned/sourced" },
  { table: "reseller_relationships", scope: "Relationships your org joins" },
];

export default function ResellerScopeCheck() {
  const { user } = useAuth();
  const guard = useResellerGuard();
  const { log } = useResellerAudit();
  const [results, setResults] = useState<ProbeResult[]>([]);
  const [running, setRunning] = useState(false);

  const runSelfCheck = async () => {
    setRunning(true);
    const out: ProbeResult[] = [];
    for (const { table, scope } of SCOPED_TABLES) {
      try {
        const { data, error, count } = await supabase
          .from(table as never)
          .select("*", { count: "exact", head: false })
          .limit(5);
        const outcome: "allowed" | "denied" = error ? "denied" : "allowed";
        out.push({
          table,
          scope,
          rows: count ?? (data ? (data as unknown[]).length : 0),
          error: error?.message ?? null,
          outcome,
        });
        await log({
          table_name: table,
          action: outcome === "denied" ? "failed_access" : "self_check",
          outcome,
          target_org_id: guard.tenantId,
          details: { rows: count ?? null, error: error?.message ?? null },
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        out.push({ table, scope, rows: null, error: msg, outcome: "denied" });
        await log({
          table_name: table,
          action: "failed_access",
          outcome: "denied",
          details: { error: msg },
        });
      }
    }
    setResults(out);
    setRunning(false);
  };

  return (
    <DashboardLayout title="Reseller Scope Self-Check">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold flex items-center gap-3">
              <Shield className="text-primary" /> Reseller Scope Self-Check
            </h1>
            <p className="text-muted-foreground mt-1">
              Verify exactly which data your reseller account can access. Every probe is audited.
            </p>
          </div>
          <Button onClick={runSelfCheck} disabled={running}>
            {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-2" />}
            Run self-check
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your scope</CardTitle>
            <CardDescription>Identity boundaries enforced by Lovable Cloud RLS</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Field label="User" value={user?.email ?? "-"} />
            <Field label="Org ID (tenant)" value={guard.tenantId ?? "-"} mono />
            <Field
              label="Reseller status"
              value={
                <Badge variant={guard.canResell ? "default" : "secondary"}>
                  {guard.canResell ? "Active" : guard.isLocked ? `Locked (${guard.lockDaysRemaining}d left)` : "Restricted"}
                </Badge>
              }
            />
            <Field
              label="Revenue split"
              value={`Platform ${guard.revenueSplit.routeace}% / Reseller ${guard.revenueSplit.reseller}%`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What you can read</CardTitle>
            <CardDescription>
              Tables you cannot read should return 0 rows or a denial - never another org's data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                Click "Run self-check" to probe scoped tables.
              </div>
            ) : (
              <div className="divide-y">
                {results.map((r) => (
                  <div key={r.table} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium">{r.table}</div>
                      <div className="text-xs text-muted-foreground">{r.scope}</div>
                      {r.error && <div className="text-xs text-destructive mt-1">{r.error}</div>}
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">
                        {r.rows ?? 0} row{(r.rows ?? 0) === 1 ? "" : "s"}
                      </Badge>
                      {r.outcome === "allowed" ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-destructive" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono text-sm break-all" : "text-sm"}>{value}</div>
    </div>
  );
}
