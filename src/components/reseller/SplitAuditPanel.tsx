/**
 * SplitAuditPanel - Admin verification view for the immutable 80/20 commission split.
 * Shows commission_ledger rows with per-row math and totals so admins can confirm
 * each completed API transaction wrote a correctly-split row.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";

const ROUTEACE_SHARE = 80;
const RESELLER_SHARE = 20;

interface LedgerRow {
  id: string;
  transaction_type: string;
  gross_amount: number;
  routeace_amount: number;
  reseller_amount: number;
  currency: string;
  status: string;
  reference_id: string | null;
  description: string | null;
  created_at: string;
  source_org_id: string | null;
  reseller_org_id: string | null;
}

const fmt = (n: number, c = "NGN") =>
  `${c === "NGN" ? "₦" : c + " "}${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const SplitAuditPanel = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["commission-ledger-audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_ledger" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as LedgerRow[];
    },
    refetchInterval: 30_000,
  });

  const rows = data || [];
  const totals = rows.reduce(
    (acc, r) => {
      acc.gross += Number(r.gross_amount || 0);
      acc.routeace += Number(r.routeace_amount || 0);
      acc.reseller += Number(r.reseller_amount || 0);
      return acc;
    },
    { gross: 0, routeace: 0, reseller: 0 }
  );

  const verifyRow = (r: LedgerRow) => {
    const expectedRouteAce = Math.round(Number(r.gross_amount) * (ROUTEACE_SHARE / 100) * 100) / 100;
    const expectedReseller = Math.round(Number(r.gross_amount) * (RESELLER_SHARE / 100) * 100) / 100;
    const ok =
      Math.abs(Number(r.routeace_amount) - expectedRouteAce) < 0.02 &&
      Math.abs(Number(r.reseller_amount) - expectedReseller) < 0.02;
    return { ok, expectedRouteAce, expectedReseller };
  };

  return (
    <div className="space-y-4">
      <Alert>
        <ShieldCheck className="w-4 h-4" />
        <AlertDescription className="text-xs">
          Every completed API transaction writes one immutable row to the commission ledger with the
          80/20 split applied server-side by <code>api-commission-engine</code>. This panel re-computes
          each split client-side and flags any deviation.
        </AlertDescription>
      </Alert>

      {/* Totals */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-xs text-muted-foreground">Rows verified</p>
          <p className="text-2xl font-bold">{rows.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-xs text-muted-foreground">Gross transacted</p>
          <p className="text-2xl font-bold">{fmt(totals.gross)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-xs text-muted-foreground">RouteAce (80%)</p>
          <p className="text-2xl font-bold text-primary">{fmt(totals.routeace)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-xs text-muted-foreground">Reseller (20%)</p>
          <p className="text-2xl font-bold text-secondary">{fmt(totals.reseller)}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> Split Verification - Last 50 Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading ledger…
            </div>
          ) : error ? (
            <p className="text-xs text-destructive py-4">Failed to load ledger: {(error as any)?.message}</p>
          ) : rows.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              No commission ledger rows yet - entries will appear as soon as the first API transaction settles.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">When</TableHead>
                    <TableHead className="text-xs">Reference</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs text-right">Gross</TableHead>
                    <TableHead className="text-xs text-right">RouteAce (80%)</TableHead>
                    <TableHead className="text-xs text-right">Reseller (20%)</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Verified</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const v = verifyRow(r);
                    return (
                      <TableRow key={r.id} className={!v.ok ? "bg-destructive/5" : undefined}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs font-mono">{r.reference_id ?? r.id.slice(0, 8)}</TableCell>
                        <TableCell className="text-xs">{r.transaction_type}</TableCell>
                        <TableCell className="text-xs text-right">{fmt(r.gross_amount, r.currency)}</TableCell>
                        <TableCell className="text-xs text-right">
                          <div>{fmt(r.routeace_amount, r.currency)}</div>
                          {!v.ok && (
                            <div className="text-[10px] text-destructive">expected {fmt(v.expectedRouteAce, r.currency)}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          <div>{fmt(r.reseller_amount, r.currency)}</div>
                          {!v.ok && (
                            <div className="text-[10px] text-destructive">expected {fmt(v.expectedReseller, r.currency)}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.status === "paid" ? "default" : "outline"} className="text-[10px]">
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {v.ok ? (
                            <span className="inline-flex items-center gap-1 text-xs text-success">
                              <CheckCircle2 className="w-3.5 h-3.5" /> 80/20
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-destructive">
                              <AlertTriangle className="w-3.5 h-3.5" /> mismatch
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SplitAuditPanel;
