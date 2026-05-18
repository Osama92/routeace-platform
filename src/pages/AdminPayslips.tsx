import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { downloadPayslipPdf, type Payslip } from "@/lib/workforce/payslipPdf";

export default function AdminPayslips() {
  const [rows, setRows] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("payslips")
        .select("*")
        .order("pay_date", { ascending: false })
        .limit(500);
      if (error) toast.error(error.message);
      setRows((data as any) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return rows;
    return rows.filter(r =>
      r.staff_name?.toLowerCase().includes(s) ||
      r.staff_email?.toLowerCase().includes(s) ||
      r.payslip_number?.toLowerCase().includes(s)
    );
  }, [q, rows]);

  const handleDownload = (p: Payslip) => {
    // Fire audit non-blocking so RPC failures never block the download
    supabase.rpc("record_payslip_download", { p_payslip_id: p.id }).then(({ error }) => {
      if (error) console.warn("Payslip download audit failed:", error.message);
    });
    try {
      downloadPayslipPdf(p);
    } catch (e: any) {
      toast.error(e.message || "Download failed");
    }
  };

  return (
    <DashboardLayout title="Payslips">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">All Payslips</h1>
            <p className="text-muted-foreground">Audit and download every payslip generated from completed payroll.</p>
          </div>
          <div className="relative w-72">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search name, email, number" value={q} onChange={e => setQ(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <Card><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Payslip #</th>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Pay date</th>
                  <th className="p-3 text-right">Gross</th>
                  <th className="p-3 text-right">Net</th>
                  <th className="p-3 text-right">Downloads</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-t">
                    <td className="p-3 font-mono text-xs">{p.payslip_number}</td>
                    <td className="p-3">
                      <div>{p.staff_name}</div>
                      <div className="text-xs text-muted-foreground">{p.staff_email}</div>
                    </td>
                    <td className="p-3">{new Date(p.pay_date).toLocaleDateString()}</td>
                    <td className="p-3 text-right">{p.currency_code} {Number(p.gross_amount).toLocaleString()}</td>
                    <td className="p-3 text-right font-semibold">{p.currency_code} {Number(p.net_amount).toLocaleString()}</td>
                    <td className="p-3 text-right">{(p as any).download_count ?? 0}</td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => handleDownload(p)}>
                        <Download className="h-4 w-4 mr-1" /> PDF
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No payslips found.</td></tr>
                )}
              </tbody>
            </table>
          </CardContent></Card>
        )}
      </div>
    </DashboardLayout>
  );
}
