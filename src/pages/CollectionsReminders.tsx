import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Play, Mail, MessageSquare, Globe, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type Reminder = {
  id: string;
  organization_id: string;
  invoice_id: string;
  customer_id: string | null;
  days_overdue: number;
  trigger_reason: string;
  language: string;
  email_status: string | null;
  email_error: string | null;
  email_sent_at: string | null;
  sms_status: string | null;
  sms_error: string | null;
  sms_sent_at: string | null;
  web_status: string | null;
  web_error: string | null;
  web_sent_at: string | null;
  created_at: string;
};

type InvoiceLite = { id: string; invoice_number: string | null; total_amount: number | null; customer_id: string | null };
type CustomerLite = { id: string; name: string | null; email: string | null; phone: string | null };

function StatusBadge({ status, error }: { status: string | null; error: string | null }) {
  if (!status) return <Badge variant="outline" className="text-[10px]">—</Badge>;
  const tone =
    status === "sent" ? "default" :
    status === "skipped" || status === "no_contact" ? "secondary" :
    "destructive";
  return (
    <span className="inline-flex items-center gap-1">
      <Badge variant={tone as any} className="text-[10px] capitalize">{status.replace(/_/g, " ")}</Badge>
      {error && <span title={error} className="text-[10px] text-destructive truncate max-w-[160px]">!</span>}
    </span>
  );
}

export default function CollectionsReminders() {
  const { organizationId } = useAuth();
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);

  const { data: reminders, isLoading, refetch } = useQuery({
    queryKey: ["collections-reminders", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections_reminders")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Reminder[];
    },
  });

  const invoiceIds = Array.from(new Set((reminders ?? []).map((r) => r.invoice_id)));
  const customerIds = Array.from(new Set((reminders ?? []).map((r) => r.customer_id).filter(Boolean) as string[]));

  const { data: invoices } = useQuery({
    queryKey: ["collections-reminders-invoices", invoiceIds],
    enabled: invoiceIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, total_amount, customer_id")
        .in("id", invoiceIds);
      if (error) throw error;
      const map: Record<string, InvoiceLite> = {};
      (data ?? []).forEach((i: any) => { map[i.id] = i; });
      return map;
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["collections-reminders-customers", customerIds],
    enabled: customerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, email, phone")
        .in("id", customerIds);
      if (error) throw error;
      const map: Record<string, CustomerLite> = {};
      (data ?? []).forEach((c: any) => { map[c.id] = c; });
      return map;
    },
  });

  const totals = (reminders ?? []).reduce(
    (acc, r) => {
      acc.total++;
      if (r.email_status === "sent") acc.email++;
      if (r.sms_status === "sent") acc.sms++;
      if (r.email_status && r.email_status !== "sent" && r.email_status !== "skipped") acc.failed++;
      return acc;
    },
    { total: 0, email: 0, sms: 0, failed: 0 },
  );

  const runNow = async () => {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke("send-collections-reminder", { body: {} });
      if (error) throw error;
      toast.success("Collections sweep triggered for your organization");
      setTimeout(() => qc.invalidateQueries({ queryKey: ["collections-reminders", organizationId] }), 800);
    } catch (e: any) {
      toast.error(e?.message ?? "Run failed");
    } finally {
      setRunning(false);
    }
  };

  if (!organizationId) {
    return (
      <DashboardLayout title="Collections reminders">
        <div className="container py-10 text-sm text-muted-foreground">No organization context found.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Collections reminders">
      <div className="container py-6 space-y-6">
        <Helmet>
          <title>Collections reminders · RouteAce</title>
          <meta name="description" content="Automated invoice collections reminders with email, SMS, and web delivery status per tenant." />
        </Helmet>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Collections reminders</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Automatic reminders sent for invoices older than 10 days. Strictly scoped to your organization.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button onClick={runNow} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              Run sweep now
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Reminders (last 200)", value: totals.total },
            { label: "Email delivered", value: totals.email, icon: Mail },
            { label: "SMS delivered", value: totals.sms, icon: MessageSquare },
            { label: "Failures", value: totals.failed, icon: Globe },
          ].map((s) => {
            const Icon = (s as any).icon;
            return (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</div>
                    {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="text-2xl font-semibold mt-1">{s.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reminder log</CardTitle>
            <CardDescription>One row per invoice / day. Delivery status shown per channel.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-10 flex items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading reminders…
              </div>
            ) : (reminders ?? []).length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No reminders yet. The daily sweep runs at 09:00 UTC, or trigger one manually above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sent at</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Days overdue</TableHead>
                      <TableHead>Lang</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>SMS</TableHead>
                      <TableHead>Web</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(reminders ?? []).map((r) => {
                      const inv = invoices?.[r.invoice_id];
                      const cust = r.customer_id ? customers?.[r.customer_id] : (inv?.customer_id ? customers?.[inv.customer_id] : undefined);
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {format(new Date(r.created_at), "MMM d, HH:mm")}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-medium">{inv?.invoice_number ?? r.invoice_id.slice(0, 8)}</div>
                            {inv?.total_amount != null && (
                              <div className="text-muted-foreground">₦{Number(inv.total_amount).toLocaleString()}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div>{cust?.name ?? "—"}</div>
                            <div className="text-muted-foreground">{cust?.email ?? cust?.phone ?? ""}</div>
                          </TableCell>
                          <TableCell className="text-xs">{r.days_overdue}</TableCell>
                          <TableCell className="text-xs uppercase">{r.language}</TableCell>
                          <TableCell><StatusBadge status={r.email_status} error={r.email_error} /></TableCell>
                          <TableCell><StatusBadge status={r.sms_status} error={r.sms_error} /></TableCell>
                          <TableCell><StatusBadge status={r.web_status} error={r.web_error} /></TableCell>
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
    </DashboardLayout>
  );
}
